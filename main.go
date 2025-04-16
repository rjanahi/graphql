package main

import (
	a "graphql/backend/auth"
	g "graphql/backend/graph"
	"log"
	"net/http"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("No .env file found, continuing with environment variables")
	}

	http.Handle("/", http.FileServer(http.Dir("./public")))
	http.HandleFunc("/api/login", a.LoginHandler)
	http.HandleFunc("/api/query", g.GraphqlHandler)

	log.Println("Server started on http://localhost:8888")
	log.Fatal(http.ListenAndServe(":8888", nil))
}
