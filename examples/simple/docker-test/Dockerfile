FROM public.ecr.aws/lambda/nodejs:22

# Copy the extracted deployment package
COPY extracted/ /var/task/

# Set the handler
CMD ["index.odataHandler"]
