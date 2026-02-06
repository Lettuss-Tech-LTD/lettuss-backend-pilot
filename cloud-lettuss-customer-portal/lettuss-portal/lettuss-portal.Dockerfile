# Use the official Node.js image as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy certs
# Copy certs and set permissions
COPY certs ./certs
RUN chmod 400 /app/certs/server8184.key /app/certs/server8184.cert

# Install the dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port that the Node.js app will run on
EXPOSE 8184

# Define the command to run the application
CMD ["npm", "start"]
