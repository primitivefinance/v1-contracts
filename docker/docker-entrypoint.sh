#!/bin/bash
sudo chown -R user:root ~/.ssh
sudo service ssh start
tail -f /dev/null
