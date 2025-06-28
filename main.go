package main

import (
	"log"
	"net/http"
	"text/template"

	a "graphql/backend/auth"
	e "graphql/backend/error"
	g "graphql/backend/graph"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file found, continuing with environment variables")
	}

	// API routes
	http.HandleFunc("/api/login", a.WithCORS(a.LoginHandler))
	http.HandleFunc("/api/query", a.WithCORS(g.GraphqlHandler))

	log.Println("Server started on http://localhost:8888")
	log.Fatal(http.ListenAndServe(":8888", nil))
}

func serveTemplate(filename string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/"+filename {
			e.HandleInternalError(w, r)
			return
		}
		tmpl, err := template.ParseFiles("./public/" + filename)
		if err != nil {
			e.HandleInternalError(w, r)
			return
		}
		if err := tmpl.Execute(w, nil); err != nil {
			e.HandleInternalError(w, r)
		}
	}
}
