@echo off
set PYTHONPATH=%~dp0
if exist c:\python27\python.exe (
  set PYTHONBIN=c:\python27\python.exe
) else (
  set PYTHONBIN=python
)
REM i18n support doesn't work on Windows, default to English.
set LANG=en
%PYTHONBIN% scripts\mailpile %*
