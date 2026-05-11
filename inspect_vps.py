#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Detecta el entorno del servidor VPS de Hostinger"""
import paramiko
import sys, io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST     = "147.93.14.206"
PORT     = 65002
USER     = "u626807608"
PASSWORD = "Rosjej26$%"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)

cmds = [
    ("OS release",     "cat /etc/os-release 2>/dev/null || cat /etc/issue 2>/dev/null || uname -a"),
    ("Whoami",         "whoami"),
    ("HOME dir",       "echo $HOME && ls $HOME"),
    ("Shell",          "echo $SHELL"),
    ("Sudo access",    "sudo -n true 2>&1 && echo HAS_SUDO || echo NO_SUDO"),
    ("Node check",     "which node || which nodejs || echo MISSING"),
    ("npm check",      "which npm || echo MISSING"),
    ("Python check",   "which python3 || which python || echo MISSING"),
    ("curl check",     "which curl || echo MISSING"),
    ("pkg manager",    "which apt-get || which yum || which dnf || which apk || echo UNKNOWN"),
    ("PATH",           "echo $PATH"),
    ("disk space",     "df -h / 2>/dev/null | tail -1"),
    ("RAM",            "free -m 2>/dev/null | head -2"),
]

for label, cmd in cmds:
    _, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    print(f"\n[{label}]")
    if out: print(f"  {out}")
    if err: print(f"  ERR: {err[:200]}")

client.close()
