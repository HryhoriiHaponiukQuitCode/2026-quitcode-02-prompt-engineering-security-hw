H=".claude/hooks/block-secret-paths.py"
pass=0; fail=0
check() { # $1=опис $2=очікуваний_код $3=json
  out=$(printf '%s' "$3" | python3 "$H" 2>/dev/null); code=$?
  if [ "$code" = "$2" ]; then pass=$((pass+1)); printf "  ✓ %-52s exit=%s\n" "$1" "$code"
  else fail=$((fail+1)); printf "  ✗ %-52s exit=%s (очікували %s)\n" "$1" "$code" "$2"; fi
}
echo "МАЄ БЛОКУВАТИ (exit 2) — обхідні шляхи, які deny-правила пропускали:"
check "Read app/.env"              2 '{"tool_name":"Read","tool_input":{"file_path":"app/.env"}}'
check "cat app/.env"               2 '{"tool_name":"Bash","tool_input":{"command":"cat app/.env"}}'
check "node -e читає .env"         2 '{"tool_name":"Bash","tool_input":{"command":"node -e \"console.log(require('fs').readFileSync('app/.env','utf8'))\""}}'
check "python -c читає .env"       2 '{"tool_name":"Bash","tool_input":{"command":"python3 -c \"print(open('app/.env').read())\""}}'
check "git show HEAD:.env"         2 '{"tool_name":"Bash","tool_input":{"command":"git show HEAD:.env"}}'
check "tar архівує .env"           2 '{"tool_name":"Bash","tool_input":{"command":"tar czf out.tgz app/.env"}}'
check "base64 .env"                2 '{"tool_name":"Bash","tool_input":{"command":"base64 app/.env"}}'
check "grep по .env.production"    2 '{"tool_name":"Bash","tool_input":{"command":"grep KEY .env.production"}}'
check "Read ~/.ssh/id_rsa"         2 '{"tool_name":"Read","tool_input":{"file_path":"/Users/x/.ssh/id_rsa"}}'
check "Read ~/.aws/credentials"    2 '{"tool_name":"Read","tool_input":{"file_path":"/Users/x/.aws/credentials"}}'
check "cat cert.pem"               2 '{"tool_name":"Bash","tool_input":{"command":"cat /etc/ssl/cert.pem"}}'
check "Grep по .netrc"             2 '{"tool_name":"Grep","tool_input":{"path":"/Users/x/.netrc"}}'
echo
echo "МАЄ ПРОПУСКАТИ (exit 0) — звичайна робота:"
check "npm test"                   0 '{"tool_name":"Bash","tool_input":{"command":"cd app && npm test"}}'
check "Read quote.ts"              0 '{"tool_name":"Read","tool_input":{"file_path":"app/src/quote.ts"}}'
check "git status"                 0 '{"tool_name":"Bash","tool_input":{"command":"git status"}}'
check "Read .env.example"          0 '{"tool_name":"Read","tool_input":{"file_path":"app/.env.example"}}'
check "згадка environment у тексті" 0 '{"tool_name":"Bash","tool_input":{"command":"echo setting up the environment"}}'
check "порожній вхід"              0 ''
echo
echo "РЕЗУЛЬТАТ: $pass пройшло, $fail впало"
[ "$fail" = 0 ] || exit 1
