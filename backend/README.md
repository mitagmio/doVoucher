## Setting up
### Make sure python 3.8 is installed

### Create .env file in `backend` directory (see `env.example`)

```shell
cd backend
pip install poetry==1.1.11
poetry install
```

# Running project locally
```shell
cd backend
poetry run python main.py
```

# Documentation 

http://localhost:8001/docs

## docker 

docker build --rm -t txme-backend:latest .

docker run --env-file .env --rm  -p 9995:9995 --name txme-backend txme-backend:latest 


# Backend tmux

### FastAPI
```
pip install fastapi
```

### Uvicorn
```
pip install Uvicorn
```

### Run
```
poetry run uvicorn main:app --host=0.0.0.0 --port=9995 --reload  
```

