update roles
set token = replace(token, '-token-replace-me', '')
where token like '%-token-replace-me';