---
id: perf-io-multiplexing-epoll-kqueue-io-uring
type: primary
depth_role: leaf
focus: "Detect blocking I/O where async multiplexing would scale, wrong event loop model, io_uring submission queue issues, and epoll edge vs level trigger misuse"
parents:
  - index.md
covers:
  - "Blocking read/write/accept on socket where epoll/kqueue/io_uring would scale"
  - "select() or poll() used for large file descriptor sets (O(n) per call)"
  - epoll edge-triggered mode without draining the socket completely
  - io_uring submission queue full without backpressure handling
  - "Event loop blocking on synchronous file I/O or DNS"
  - Thread-per-connection model for high-concurrency server
  - "Mixing blocking and non-blocking I/O on the same event loop"
  - Missing EPOLLONESHOT causing race in multi-threaded epoll
tags:
  - epoll
  - kqueue
  - io-uring
  - select
  - poll
  - event-loop
  - async
  - multiplexing
  - non-blocking
  - performance
activation:
  file_globs:
    - "**/*.c"
    - "**/*.cpp"
    - "**/*.rs"
    - "**/*.go"
    - "**/*.java"
    - "**/*.py"
    - "**/*.rb"
    - "**/*.zig"
  keyword_matches:
    - epoll
    - kqueue
    - io_uring
    - "select("
    - "poll("
    - event_loop
    - event loop
    - non-blocking
    - nonblocking
    - O_NONBLOCK
    - EPOLLET
    - EPOLLIN
    - EPOLLOUT
    - EV_READ
    - EV_WRITE
    - IORING
    - submission
    - completion
    - accept
    - recv
    - send
    - EAGAIN
    - EWOULDBLOCK
  structural_signals:
    - blocking_io_server
    - select_large_fdset
    - edge_trigger_no_drain
    - io_uring_no_backpressure
source:
  origin: file
  path: perf-io-multiplexing-epoll-kqueue-io-uring.md
  hash: "sha256:1598dae5b749859aa5c0a46e9a1e549213878425f1b64d0fa833f8046f814fda"
---
# I/O Multiplexing -- epoll, kqueue, io_uring

## When This Activates

Activates on diffs involving socket servers, event loops, network I/O syscalls, or async runtime configuration. The choice of I/O multiplexing mechanism determines how a server scales with concurrent connections. Blocking I/O with thread-per-connection fails at thousands of connections due to thread overhead. select/poll scale O(n) per call. epoll (Linux), kqueue (BSD/macOS), and io_uring (Linux 5.1+) scale O(1) with registered interest but have subtle correctness requirements. This reviewer detects I/O model choices that limit scalability and common correctness errors in event-driven I/O.

## Audit Surface

- [ ] select() or poll() with >1000 file descriptors
- [ ] Blocking read()/recv()/accept() in a server handling concurrent connections
- [ ] epoll_ctl with EPOLLET (edge-triggered) without loop to drain EAGAIN
- [ ] io_uring_submit() without checking return value for SQ full
- [ ] Synchronous file I/O (read, write, stat) on event loop thread
- [ ] Synchronous DNS resolution (getaddrinfo) on event loop thread
- [ ] Thread-per-connection with accept() in a loop (not using epoll/kqueue)
- [ ] epoll_wait in multi-threaded mode without EPOLLONESHOT or EPOLLEXCLUSIVE
- [ ] kqueue with EV_CLEAR (edge) without complete read loop
- [ ] Event loop with no timer or idle callback mechanism for housekeeping
- [ ] Busy-wait loop polling for I/O readiness instead of blocking on epoll_wait
- [ ] Missing SO_REUSEPORT for multi-threaded accept scaling

## Detailed Checks

### Blocking I/O in Concurrent Servers
<!-- activation: keywords=["accept", "read", "recv", "send", "write", "block", "thread", "fork", "connection", "socket", "server", "listen"] -->

- [ ] **Thread-per-connection model**: flag server designs that spawn a thread or fork a process per accepted connection -- thread overhead (stack memory, scheduling) limits scalability to low thousands; use an event loop with epoll/kqueue or an async runtime
- [ ] **Blocking accept in main thread**: flag `accept()` called in a blocking loop without non-blocking mode or epoll readiness notification -- the accept call blocks the thread even when other connections need service
- [ ] **Blocking file I/O on event loop**: flag synchronous `read()`, `write()`, `stat()`, or `open()` on a file descriptor from the event loop thread -- file I/O can block for milliseconds (disk seek, page fault); offload to a thread pool or use io_uring for async file I/O

### select/poll Scalability
<!-- activation: keywords=["select(", "poll(", "FD_SET", "FD_ISSET", "fd_set", "pollfd", "nfds", "POLLIN", "POLLOUT"] -->

- [ ] **select with large fd set**: flag `select()` used with more than a few hundred file descriptors -- select is O(n) per call and limited to FD_SETSIZE (typically 1024); migrate to epoll/kqueue
- [ ] **poll with large fd array**: flag `poll()` with >1000 pollfd entries -- poll avoids the FD_SETSIZE limit but is still O(n) per call, scanning every descriptor each time

### epoll Correctness
<!-- activation: keywords=["epoll", "epoll_create", "epoll_ctl", "epoll_wait", "EPOLLIN", "EPOLLOUT", "EPOLLET", "EPOLLONESHOT", "EPOLLEXCLUSIVE", "EAGAIN", "edge", "level"] -->

- [ ] **Edge-triggered without drain**: flag `EPOLLET` (edge-triggered) mode where the read handler does not loop until `EAGAIN` -- edge-triggered epoll notifies only once per readiness transition; if the handler reads only one buffer, remaining data is never delivered until new data arrives
- [ ] **Multi-threaded epoll without ONESHOT**: flag multiple threads calling `epoll_wait` on the same epoll fd without `EPOLLONESHOT` or `EPOLLEXCLUSIVE` -- without ONESHOT, multiple threads can receive the same event, causing races; without EPOLLEXCLUSIVE (Linux 4.5+), thundering herd occurs on accept
- [ ] **Missing error event handling**: flag epoll usage that does not check for `EPOLLERR` and `EPOLLHUP` -- these events are always reported regardless of registration; ignoring them causes busy loops on errored sockets

### io_uring Usage
<!-- activation: keywords=["io_uring", "uring", "IORING", "submission", "completion", "SQE", "CQE", "io_uring_submit", "io_uring_prep", "IOSQE", "liburing"] -->

- [ ] **SQ full without backpressure**: flag `io_uring_submit()` calls without checking for `SQ full` return or without ensuring submission queue capacity before preparing entries -- overflowing the SQ silently drops operations
- [ ] **Missing CQ drain**: flag io_uring usage that does not drain the completion queue regularly -- CQ overflow drops completed entries and sets the `CQ_OVERFLOW` flag, losing results silently
- [ ] **Fixed buffer not registered**: flag io_uring read/write using regular buffers in high-throughput paths -- registering fixed buffers (`IORING_REGISTER_BUFFERS`) avoids per-operation buffer pinning overhead

### DNS and Auxiliary I/O
<!-- activation: keywords=["getaddrinfo", "gethostbyname", "resolve", "DNS", "lookup", "hostname"] -->

- [ ] **Synchronous DNS on event loop**: flag `getaddrinfo()`, `gethostbyname()`, or equivalent synchronous DNS resolution on the event loop thread -- DNS resolution can block for seconds on timeout; use c-ares, getdns, or a thread pool for async resolution

## Common False Positives

- **Low-concurrency services**: services handling <100 concurrent connections can use thread-per-connection or blocking I/O effectively. Flag only when high concurrency is expected or documented.
- **Framework-managed event loops**: most async frameworks (Tokio, libuv, Netty, asyncio) handle epoll/kqueue correctly internally. Flag only when the application code bypasses the framework's I/O layer.
- **File I/O with io_uring**: io_uring supports async file I/O natively. If io_uring is already used for file operations, do not flag them as blocking.
- **Platform-specific code**: epoll is Linux-only, kqueue is BSD/macOS-only. Do not flag missing epoll on macOS or missing kqueue on Linux.

## Severity Guidance

| Finding | Severity |
|---|---|
| Edge-triggered epoll without drain loop (data loss risk) | Critical |
| io_uring SQ overflow without backpressure (operation loss) | Critical |
| Blocking DNS resolution on event loop thread | Important |
| Thread-per-connection model for high-concurrency server | Important |
| select() with >1000 file descriptors | Important |
| Multi-threaded epoll without ONESHOT/EXCLUSIVE | Important |
| Blocking file I/O on event loop thread | Important |
| Busy-wait polling instead of epoll_wait | Minor |
| Missing SO_REUSEPORT for multi-threaded accept | Minor |
| io_uring without registered fixed buffers in throughput path | Minor |

## See Also

- `perf-network-io` -- higher-level network I/O patterns (connection pooling, compression, timeouts)
- `perf-numa-awareness` -- interrupt and thread affinity interact with I/O multiplexing performance
- `antipattern-chatty-coupling` -- chatty protocols amplify the number of I/O events the multiplexer must handle
- `perf-profiling-discipline` -- strace and perf validate I/O syscall patterns before redesigning

## Authoritative References

- [Linux man page, `epoll(7)` -- epoll API, edge vs level triggered, and multi-threaded usage](https://man7.org/linux/man-pages/man7/epoll.7.html)
- [Jens Axboe, "io_uring" -- design, submission/completion model, and kernel interface](https://kernel.dk/io_uring.pdf)
- [FreeBSD man page, `kqueue(2)` -- kqueue API and EV_CLEAR edge semantics](https://www.freebsd.org/cgi/man.cgi?kqueue)
- [Brendan Gregg, *Systems Performance*, 2nd ed. (2020), Chapter 10: "Network" -- I/O model profiling](https://www.brendangregg.com/systems-performance-2nd-edition-book.html)
