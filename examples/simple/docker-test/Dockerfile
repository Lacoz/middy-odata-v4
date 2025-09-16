FROM public.ecr.aws/lambda/nodejs:22

# Copy the deployment package
COPY deployment/ /var/task/

# Set the handler
CMD ["index.handler"]
