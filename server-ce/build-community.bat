@echo off
REM Set up environment
setlocal enabledelayedexpansion

REM Get current Git branch name
for /f "delims=" %%a in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%a

REM Get current Git commit hash
for /f "delims=" %%a in ('git rev-parse HEAD') do set REVISION=%%a

REM Construct docker tags
set BASE_TAG=sharelatex/sharelatex-base:%BRANCH%-%REVISION%
set SHARELATEX_TAG=sharelatex/sharelatex:%BRANCH%-%REVISION%
set SHARELATEX_BRANCH=sharelatex/sharelatex:%BRANCH%

REM Download winfonts.zip if not present
if not exist winfonts.zip (
    echo Downloading winfonts.zip...
    curl -L -o winfonts.zip https://github.com/BobH233/overleaf-dev/releases/download/attachment/winfonts.zip
) else (
    echo winfonts.zip already exists, skipping download.
)

REM Copy .dockerignore and winfonts.zip to parent directory
copy .dockerignore ..
copy winfonts.zip ..

REM Run Docker build for sharelatex
docker build ^
  --build-arg BUILDKIT_INLINE_CACHE=1 ^
  --progress=plain ^
  --build-arg OVERLEAF_BASE_TAG=%BASE_TAG% ^
  --build-arg MONOREPO_REVISION=%REVISION% ^
  --cache-from sharelatex/sharelatex ^
  --cache-from %SHARELATEX_BRANCH% ^
  --file Dockerfile ^
  --tag %SHARELATEX_TAG% ^
  --tag %SHARELATEX_BRANCH% ^
  ..