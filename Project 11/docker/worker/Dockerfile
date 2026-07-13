# syntax=docker/dockerfile:1
# Pulsar / Reelforge Media — pulsar-worker-sdk demo worker image

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
COPY pulsar-common/pom.xml pulsar-common/pom.xml
COPY pulsar-core/pom.xml pulsar-core/pom.xml
COPY pulsar-server/pom.xml pulsar-server/pom.xml
COPY pulsar-worker-sdk/pom.xml pulsar-worker-sdk/pom.xml
COPY pulsar-common/src pulsar-common/src
COPY pulsar-core/src pulsar-core/src
COPY pulsar-worker-sdk/src pulsar-worker-sdk/src
RUN mvn -pl pulsar-common,pulsar-core,pulsar-worker-sdk -am clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S pulsar && adduser -S pulsar -G pulsar
WORKDIR /app
COPY --from=build /build/pulsar-worker-sdk/target/pulsar-worker-sdk-1.0.0-exec.jar /app/pulsar-worker-demo.jar
RUN chown -R pulsar:pulsar /app
USER pulsar
ENTRYPOINT ["java", "-jar", "/app/pulsar-worker-demo.jar"]
