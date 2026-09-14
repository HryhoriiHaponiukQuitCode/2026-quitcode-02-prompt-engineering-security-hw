#!/usr/bin/env python3
"""PreToolUse-хук: блокує доступ до секретних шляхів НЕЗАЛЕЖНО від інструмента.

Навіщо. Deny-правила в settings.json прив'язані до конкретних команд:
`Bash(cat *.env*)` не ловить `node -e`, `python -c`, `git show HEAD:.env`,
`tar`, `base64` — усе це різні шляхи до тих самих байтів. Хук перевіряє
цільовий шлях, а не спосіб звернення до нього.

Контракт: JSON на stdin, exit 0 = пропустити, exit 2 = заблокувати
(stderr повертається моделі як причина відмови).

Тести: .claude/hooks/test-block-secret-paths.sh — запускати після кожної зміни.
"""
import json
import re
import sys

# Шаблони-винятки перевіряються ПЕРШИМИ: це приклади без секретів.
ALLOWED = re.compile(
    r"\.env\.(example|sample|template|dist)\b|\benv\.example\b",
    re.IGNORECASE,
)

# Межа "слова" для шляху: початок рядка або будь-що, крім символів шляху.
# Свідомо широко — хибне спрацювання коштує уточнення, пропуск коштує витоку.
BLOCKED = re.compile(
    r"""
    (?:^|[^\w.-])                 # межа зліва: не буква/цифра/крапка/дефіс
    (?:
        \.env\b                   # .env, .env.production, app/.env
      | id_rsa\b | id_ed25519\b | id_ecdsa\b
      | [\w./-]*\.(?:pem|p12|pfx|key|keystore|jks)\b
      | [\w./-]*secrets?\.[\w]+   # secrets.json, secret.yaml
      | [\w./-]*credentials\b
      | \.netrc\b | \.pgpass\b | \.npmrc\b | \.pypirc\b
    )
    | /\.ssh/ | /\.aws/ | /\.gnupg/ | /\.config/gh/   # цілі каталоги
    """,
    re.VERBOSE | re.IGNORECASE,
)

# Поля tool_input, які можуть містити шлях або команду.
FIELDS = ("command", "file_path", "path", "pattern", "notebook_path", "url")

MESSAGE = """\
ЗАБЛОКОВАНО хуком block-secret-paths.py: звернення до секретного шляху
(.env / .pem / .key / id_rsa / ~/.ssh / ~/.aws / credentials / .netrc).

Заборона діє незалежно від інструмента й команди — cat, grep, node -e,
python -c, git show, tar, base64 закриті однаково, бо перевіряється шлях,
а не спосіб звернення до нього.

Вона НЕ знімається підтвердженням у чаті (AGENTS.md §2): агент не може
перевірити правдивість прохання, а ін'єкція сформулює його так само
переконливо. Потрібен вміст секретного файлу — людина відкриває його сама.
Секрети потрапляють у код лише через process.env на етапі запуску.
"""


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0  # не змогли розібрати — не блокуємо легітимну роботу

    if not isinstance(data, dict):
        return 0

    tool_input = data.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        tool_input = {}

    haystack = "\n".join(
        v for k in FIELDS if isinstance(v := tool_input.get(k), str)
    )
    if not haystack:
        return 0

    # Прибираємо дозволені приклади, щоб .env.example не тягнув за собою .env
    probe = ALLOWED.sub(" ", haystack)

    if BLOCKED.search(probe):
        sys.stderr.write(MESSAGE)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
