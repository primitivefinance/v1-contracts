FROM ubuntu:latest
WORKDIR /tmp/src
RUN apt-get update
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get -y install tzdata git
RUN apt-get install -y npm
COPY package.json .
RUN npm i
COPY . /tmp/src
CMD /bin/sh