package main

import (
	"log"
	"net/http"
	"os"

	"graphql/internal/handlers"
	"graphql/internal/utils"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// Static files
	fs := http.FileServer(http.Dir("./internal/ui/static"))
	mux.Handle("/static/", http.StripPrefix("/static/", fs))

	// Routes
	mux.HandleFunc("/", handlers.ProfileHandler)
	mux.HandleFunc("/login", handlers.LoginHandler)
	mux.HandleFunc("/logout", handlers.LogoutHandler)

	log.Printf("Server running at http://localhost:%s...", port)
	err := http.ListenAndServe(":"+port, utils.LoggingMiddleware(mux))
	if err != nil {
		log.Fatal("Server failed:", err)
	}
}
