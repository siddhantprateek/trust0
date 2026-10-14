@echo off
rem Download the training data and prepare it at the same time.
rem   logs\download.log  - parallel downloads, GB done, MB/s, ETA
rem   logs\prepare.log   - shards converted as soon as they finish downloading
rem Safe to rerun: both steps skip work that's already done.
cd /d "%~dp0"
if not exist logs mkdir logs
rem Xet downloads use their own networking, which tries IPv6 first and hangs on this network.
rem Plain HTTP goes through Python, where sources.py forces IPv4. The timeout turns any stall into a retry.
set HF_HUB_DISABLE_XET=1
set HF_HUB_DOWNLOAD_TIMEOUT=60
set HF_HUB_ETAG_TIMEOUT=60

rem prepare --watch keeps converting new shards and exits once download_data.py writes logs\download.done
if exist logs\download.done del logs\download.done
echo [%date% %time%] prepare (watch) started >> logs\prepare.log
start "trust0-prepare" /b cmd /c ".venv\Scripts\python -u -W ignore prepare_data.py --watch --workers 6 >> logs\prepare.log 2>&1"

echo [%date% %time%] download started >> logs\download.log
.venv\Scripts\python -u -W ignore download_data.py --parallel 8 >> logs\download.log 2>&1
echo [%date% %time%] download finished (exit %errorlevel%) >> logs\download.log
