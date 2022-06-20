#!/usr/bin/env bash
kill -9 $(lsof -i:4569 | awk '{print $2}' | grep -v '^PID')
