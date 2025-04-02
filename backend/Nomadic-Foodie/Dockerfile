FROM openjdk:21-jdk-slim
LABEL authors="ronak"

# Set the argument for the JAR file name
ARG JAR_FILE=build/libs/*.jar

# Copy the JAR into the image
COPY ${JAR_FILE} app.jar

# Run the JAR
ENTRYPOINT ["java", "-jar", "/app.jar"]
