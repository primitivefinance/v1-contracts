FROM ubuntu
ENV DEBIAN_FRONTEND=noninteractive
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN useradd -rm -s /bin/bash -g root -G sudo user
RUN apt-get update
RUN apt-get install -y software-properties-common build-essential curl git-core openssh-server sudo vim vim-tiny tzdata
RUN sed 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' -i /etc/pam.d/sshd
RUN mkdir /var/run/sshd
RUN bash -c 'install -m755 <(printf "#!/bin/sh\nexit 0") /usr/sbin/policy-rc.d'
RUN ex +'%s/^#\zeListenAddress/\1/g' -scwq /etc/ssh/sshd_config
RUN ex +'%s/^#\zeHostKey .*ssh_host_.*_key/\1/g' -scwq /etc/ssh/sshd_config
RUN RUNLEVEL=1 dpkg-reconfigure openssh-server
RUN ssh-keygen -A -v
RUN update-rc.d ssh defaults
RUN ex +"%s/^%sudo.*$/%sudo ALL=(ALL:ALL) NOPASSWD:ALL/g" -scwq! /etc/sudoers
RUN add-apt-repository ppa:deadsnakes/ppa
RUN apt-get update
RUN apt-get install -y python3.8 python3-pip
RUN python3.8 -m pip install virtualenv
RUN bash -c 'echo "Set disable_coredump false" >> /etc/sudo.conf'
USER user
WORKDIR /home/user
RUN virtualenv -p python3.8 .venv
RUN bash -c 'echo "source ~/.venv/bin/activate" >> ~/.bashrc'
WORKDIR /app
USER root
RUN chown -R user /app
COPY ./docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
USER user
COPY . .
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
RUN bash -c 'source ~/.nvm/nvm.sh && source ~/.venv/bin/activate && nvm install v12.16.3 && nvm use v12.16.3 && npm install -g yarn'
CMD ["/docker-entrypoint.sh"]
