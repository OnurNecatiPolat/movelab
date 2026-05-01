$ErrorActionPreference = "Stop"

$Root = "C:\MoveLabFresh"
. "$Root\scripts\env.ps1"

cd "$Root\frontend"

npm install
npm run dev
