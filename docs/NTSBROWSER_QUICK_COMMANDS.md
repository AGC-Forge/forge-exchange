# Nstbrowser Quick Commands (nstcli)

## Daily operations

export TOKEN=29578750-aec0-45b7-82ae-f77bec1e272e

nstcli info # cek agent status
nstcli ps # list semua profiles
nstcli create "profile-name" --platform Windows # buat profile baru
nstcli run <profile-id> # launch profile (CDP port dinamis)
nstcli stop <profile-id> # stop profile
nstcli rm <profile-id> # hapus profile

## Health check

nstcli info 2>&1 | python3 -m json.tool

## CDP endpoint setelah run

# Port dinamis, cek dengan:

ss -tlnp | grep nstchrome
curl -s "http://127.0.0.1:<PORT>/json/version"

## Cleanup test profile

nstcli stop bcc18647-293e-40de-a256-850dee0ebe4d
nstcli rm bcc18647-293e-40de-a256-850dee0ebe4d
