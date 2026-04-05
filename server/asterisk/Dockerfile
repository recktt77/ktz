FROM alpine:3.20

RUN apk add --no-cache \
    asterisk \
    asterisk-sounds-en \
    asterisk-sample-config

# Copy configuration (overrides sample config)
COPY conf/ /etc/asterisk/

# ARI + SIP + RTP ports
EXPOSE 5060/udp 5060/tcp 8088 10000-10100/udp

CMD ["asterisk", "-f", "-vvv"]
