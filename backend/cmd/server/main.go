// Command server runs the calculator API.
//
// It listens on the address in the ADDR environment variable (default
// 127.0.0.1:8081) and shuts down gracefully on Ctrl+C or SIGTERM.
package main

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/alan-escobar-dev/go-react-calculator/backend/internal/api"
)

// defaultAddr is loopback-only: during development nothing is exposed to the
// network, and Windows does not show a firewall prompt on every `go run`.
// Docker sets ADDR=:8081 to listen on all interfaces.
const defaultAddr = "127.0.0.1:8081"

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("server stopped with an error", "error", err)
		os.Exit(1)
	}
}

// run serves the API until the listener fails or a shutdown signal arrives.
// It is separate from main so that its deferred calls run before os.Exit.
func run(logger *slog.Logger) error {
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = defaultAddr
	}
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}

	// Timeouts stop slow or stalled clients from holding connections open;
	// http.Server has none by default.
	srv := &http.Server{
		Handler:           api.NewHandler(logger),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// ctx is canceled on Ctrl+C or SIGTERM (which `docker stop` sends).
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() { serveErr <- srv.Serve(ln) }()
	logger.Info("server listening", "addr", ln.Addr().String())

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
	}

	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// Shutdown stops accepting new connections and waits (up to 5 s) for
	// in-flight requests to finish before returning.
	return srv.Shutdown(shutdownCtx)
}
