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

	// Static file serving
	http.Handle("/css/", http.StripPrefix("/css/", http.FileServer(http.Dir("./public/css/"))))
	http.Handle("/js/", http.StripPrefix("/js/", http.FileServer(http.Dir("./public/js/"))))
	http.Handle("/errorPages/", http.StripPrefix("/errorPages/", http.FileServer(http.Dir("./public/errorPages/"))))
	http.HandleFunc("/", a.WithCORS(func(w http.ResponseWriter, r *http.Request) {
		filePath := "./public" + r.URL.Path
		if r.URL.Path == "/" {
			filePath = "./public/index.html"
		}
		
		if _, err := http.Dir("./public").Open(r.URL.Path); err != nil {
			// File not found — show custom 404
			e.HandleNotFound(w, r)
			return
		}
	
		http.ServeFile(w, r, filePath)
	}))
	

	// API routes
	http.HandleFunc("/api/login", a.WithCORS(a.LoginHandler))
	http.HandleFunc("/api/query", a.WithCORS(g.GraphqlHandler))

	// HTML page routes
	http.HandleFunc("/index.html", serveTemplate("index.html"))
	http.HandleFunc("/profile.html", serveTemplate("profile.html"))

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
