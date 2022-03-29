FROM python:3.8

# set work dir
WORKDIR /code

# create code dir inside container
RUN mkdir src

# copy code to container
COPY . src

# copy handler function to container
COPY ./app.py . 

# install dependencies for running time environment
RUN pip3 install --no-cache-dir -r ./src/requirements.txt

# ENV
ENV PYTHONPATH="$PYTHONPATH:./"

# Specify the command to run on container start
CMD [ "python", "./app.py" ]