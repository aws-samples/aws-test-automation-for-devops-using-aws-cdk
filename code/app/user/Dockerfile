FROM public.ecr.aws/amazoncorretto/amazoncorretto:11-al2-jdk
CMD ["/bin/sh"]
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} boot.jar
ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=dev", "-Dcom.amazonaws.sdk.disableEc2Metadata=true", "/boot.jar"]