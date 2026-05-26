import os
import psycopg2
from dotenv import load_dotenv

def create_database():
    load_dotenv()
    db_name = os.environ.get("DB_NAME", "avc_prediction")
    db_user = os.environ.get("DB_USER", "postgres")
    db_pass = os.environ.get("DB_PASSWORD", "postgres")
    db_host = os.environ.get("DB_HOST", "localhost")
    db_port = os.environ.get("DB_PORT", "5432")

    print(f"Connecting to default 'postgres' database on {db_host}:{db_port}...")
    try:
        # Connect to default postgres DB first to create the app DB
        conn = psycopg2.connect(
            dbname="postgres",
            user=db_user,
            password=db_pass,
            host=db_host,
            port=db_port
        )
    except psycopg2.OperationalError as e:
        print(f"Failed to connect to postgres with password. Trying without password...")
        try:
            conn = psycopg2.connect(
                dbname="postgres",
                user=db_user,
                password="",
                host=db_host,
                port=db_port
            )
            # Update password in .env if successful without password
            with open(".env", "r") as f:
                lines = f.readlines()
            with open(".env", "w") as f:
                for line in lines:
                    if line.startswith("DB_PASSWORD="):
                        f.write("DB_PASSWORD=\n")
                    else:
                        f.write(line)
            print("Successfully connected without password. Updated .env to reflect empty password.")
        except Exception as ex:
            print("Could not connect to PostgreSQL. Please verify your postgres configuration.")
            raise ex

    conn.autocommit = True
    cursor = conn.cursor()

    cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}';")
    exists = cursor.fetchone()

    if not exists:
        print(f"Database '{db_name}' does not exist. Creating it...")
        cursor.execute(f"CREATE DATABASE {db_name};")
        print(f"Database '{db_name}' created successfully!")
    else:
        print(f"Database '{db_name}' already exists.")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    create_database()
