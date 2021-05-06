#!/usr/bin/env bash

curl -fsSL -o /tmp/lando-latest.deb https://github.com/lando/lando/releases/download/v3.0.26/lando-v3.0.26.deb
sudo dpkg -i /tmp/lando-latest.deb
lando version
