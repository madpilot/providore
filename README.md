# Providore

Providore is a simple, yet secure IoT provisioning system for your home IoT network. It runs over HTTP and HTTPS.

## Getting started

It's still early days - we aren't ready for prime time yet. Though if your interested in helping and know Typescript or C (and the Espressif IDF) feel free to fork and submitting
PRs!

## Security

There are a number of hurdles to jump when provisioning IoT devices: How do you configure a device? How do you update x509 certificates when connecting to MQTT? Doing these tasks
manually is tedious, especially if the device is in a difficult to access place. WiFi enabled devices can automate many of these tasks, but doing this securely can be difficult.

Requests to Providore are signed using SHA265-HMAC with a pre-shared key, that is created when uploading the first bootstrap firmware. On some devices, you are able to store
this key in a cryptographically secure part of the ROM, which means it won't be exposed in a memory dump. The device can also verify that config data, firmware and certificates
have not been tampered with, by recalculating the signature that is attached to each response.

An example HTTP/S request looks like this:

```
GET /config.json
Authorization: 'Hmac key-id="d8fa0180", signature="QuvQRPmg6Z9fjpF/+PAtrRR4arXU5AYVBCsLrOcVDm0="'
Created-At: '2021-04-09T13:01:24.154Z'
Expiry: '2021-04-09T13:11:24.154Z'
```

The `key-id` is a unique id that identifies the device - it is also uploaded when the bootstap firmware is uploaded. The signature is calculated by taking the SHA254-HMAC hash
of the the HTTP method, the HTTP path, the created-at date and the expiry date, signed using the pre-shared key.

The response also includes a created-at and expiry header, as well as a signature header. The response signature is the SHA254-HMAC hash of the payload body, the created-at date
and the expiry date, signed using the pre-shared key.

## Device configuration

All of the device data is stored in JSON files, so there are no databases to setup (Though, I'm not discounting SQLite in the future).

## Support

The first version of providore will support pre-rolled firmware for the ESP32-S2

## Roadmap

In no particular order:

- Bootstrap firmware - Due to it's native SHA265 support, and it's ability to store pre-shared keys securely, the first version of the bootstrap firmware will be for ESP32-S2
- Automatic discovery - Devices should be able to find your providore instance as soon as they come online
- Configuration management - Devices can download a configuration file which includes settings
- Pull firmware deployment - Devices will be able to check for new versions of firmware, then download and automatically update using Over-the-air (OTA) updates
- Certificates - Devices can request a x509 certificate (by generating a CSR), and can download the resulting certificate.
- Push configuration, firmware and certificates - The ability to notify a device that it has a new configuration, firmware or certificate. Use different backends: UDP broadcast, MQTT etc
- Web management frontend
