# Use the official Node.js image as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Install necessary dependencies
COPY package*.json ./
RUN npm install

# Copy the CSV injector script
COPY . .

# Expose any required ports (if needed, but not necessary for this task)
EXPOSE 3001

# Run the script when the container starts
CMD ["node", "data-loader.js"]
