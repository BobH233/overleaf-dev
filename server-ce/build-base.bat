@echo off
REM Copy .dockerignore to parent directory
copy .dockerignore ..

REM Get current Git branch name
for /f "delims=" %%a in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%a

REM Get current Git commit hash
for /f "delims=" %%a in ('git rev-parse HEAD') do set REVISION=%%a

REM Construct docker tags
set BASE_TAG=sharelatex/sharelatex-base:%BRANCH%-%REVISION%
set BASE_BRANCH=sharelatex/sharelatex-base:%BRANCH%

REM Run Docker build
docker build ^
  --build-arg BUILDKIT_INLINE_CACHE=1 ^
  --progress=plain ^
  --file Dockerfile-base ^
  --pull ^
  --cache-from sharelatex/sharelatex-base ^
  --cache-from %BASE_BRANCH% ^
  --tag %BASE_TAG% ^
  --tag %BASE_BRANCH% ^
  ..