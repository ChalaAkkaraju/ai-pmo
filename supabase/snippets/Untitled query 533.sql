update roles
set access_token = replace(access_token, '-token-replace-me', '')
where access_token like '%-token-replace-me';