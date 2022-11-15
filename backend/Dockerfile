FROM python:3.8

ENV POETRY_VERSION=1.1.11
ENV ENVIRONMENT=DEV
# Installing packages

RUN pip install "poetry==$POETRY_VERSION"
RUN pip install uvicorn
RUN pip install environs

# Defining working directory and adding source code
WORKDIR /backend
COPY  ./poetry.lock ./pyproject.toml  /backend/

# Install API dependencies
RUN poetry config virtualenvs.create false
RUN poetry install -vvv

COPY . /backend

# Start app
#CMD ["python", "main.py"]
CMD ["poetry", "run", "uvicorn", "main:app", "--host=0.0.0.0", "--port=9997", "--reload"]