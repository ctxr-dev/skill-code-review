---
id: embedded-firmware-rtos
type: primary
depth_role: leaf
focus: "Detect embedded / RTOS hazards -- ISR misuse, watchdog omissions, stack sizing, priority inversion, DMA memory placement, missing volatile, and MMIO / memory-barrier bugs"
parents:
  - index.md
covers:
  - "printf / heap allocation / blocking calls in ISR context"
  - "Watchdog not refreshed in long-running loops (unintended resets)"
  - "RTOS task stack undersized -> stack overflow corruption"
  - Priority inversion without priority inheritance on shared mutex
  - "DMA buffer in non-DMA-safe / cached memory region"
  - "Dynamic allocation (malloc) in hot / real-time path"
  - MMIO registers accessed without volatile qualifier
  - Interrupt latency not measured or budgeted
  - Task starvation from unbounded high-priority task
  - "HAL / peripheral calls without error-code inspection"
  - "OTA firmware update without rollback / fail-safe path"
  - Deep sleep entered without a wake source configured
  - "Missing DMB / DSB / ISB memory barriers on ARM Cortex shared state"
tags:
  - embedded
  - firmware
  - rtos
  - freertos
  - zephyr
  - mcu
  - bare-metal
  - isr
  - dma
  - watchdog
  - cortex
activation:
  file_globs:
    - "**/*.c"
    - "**/*.cpp"
    - "**/*.h"
    - "**/CMakeLists.txt"
    - "**/*.ld"
    - "**/Kconfig"
    - "**/prj.conf"
  keyword_matches:
    - FreeRTOS
    - Zephyr
    - xTaskCreate
    - vTaskDelay
    - xQueueSend
    - xSemaphoreTake
    - ISR
    - interrupt
    - NVIC
    - HAL_
    - HAL
    - watchdog
    - WDT
    - IWDG
    - DMA
    - SPI
    - I2C
    - UART
    - bare-metal
    - firmware
    - MCU
    - microcontroller
    - __WFI
    - __disable_irq
  structural_signals:
    - isr_blocking_call
    - missing_watchdog_refresh
    - dma_unsafe_buffer
    - missing_volatile
source:
  origin: file
  path: embedded-firmware-rtos.md
  hash: "sha256:a79b5222947d46db55d812ab1b27a424857a33e8370409c2667dcec8eefb19c6"
---
# Embedded Firmware and RTOS

## When This Activates

Activates on diffs in MCU firmware, bare-metal code, or RTOS-based projects (FreeRTOS, Zephyr, ThreadX). Embedded bugs are expensive -- a field reset loop, silent watchdog trip, or DMA corruption is often undiagnosable without an oscilloscope. This reviewer enforces the classic embedded discipline: ISRs do nothing, watchdogs are fed, DMA buffers live in DMA-safe memory, shared state is atomic, and OTA paths have rollback.

## Audit Surface

- [ ] printf / sprintf / heap call inside ISR
- [ ] Non-FromISR RTOS API inside ISR (xQueueSend vs xQueueSendFromISR)
- [ ] Long loop with no watchdog refresh
- [ ] xTaskCreate stack size too small for task's usage
- [ ] Shared mutex without priority inheritance
- [ ] DMA buffer in cached / stack / non-DMA-safe memory
- [ ] malloc / new / std::vector in real-time path
- [ ] MMIO register access missing volatile
- [ ] No ISR latency budget / measurement
- [ ] High-priority task starves lower-priority work
- [ ] HAL_* return code unchecked
- [ ] OTA path missing rollback / verification
- [ ] Deep sleep without wake source configured
- [ ] Shared variable across task/ISR without atomic or barrier
- [ ] __disable_irq without matching__enable_irq on every exit path
- [ ] Stack-overflow hook disabled or empty
- [ ] Repeated malloc/free of variable sizes (fragmentation risk)
- [ ] Non-reentrant libc function called from multiple tasks
- [ ] Bootloader missing signature / checksum verification
- [ ] Peripheral clock enabled but reset not released

## Detailed Checks

### ISR Discipline
<!-- activation: keywords=["ISR", "IRQHandler", "interrupt", "__attribute__((interrupt))", "HAL_GPIO_EXTI_Callback", "FromISR"] -->

- [ ] **printf / sprintf in ISR**: flag any `printf`, `sprintf`, or formatted-output call inside an interrupt handler -- newlib's printf pulls in malloc, takes the heap lock, and produces 50-200 us latency; use an SPSC log buffer drained from a task
- [ ] **Non-FromISR RTOS API in ISR**: flag `xQueueSend`, `xSemaphoreTake`, `xEventGroupSetBits` (without `FromISR` suffix) inside an ISR -- these assume task context and corrupt the scheduler
- [ ] **Blocking call in ISR**: flag `HAL_Delay`, busy-wait loops, spinlocks, or any wait-for-condition inside an ISR -- interrupts must return in microseconds; defer work to a task via a queue or semaphore give
- [ ] **ISR does not clear pending flag**: flag peripheral ISR that reads data but does not clear the interrupt flag (e.g., SPI RXNE, UART ORE) -- re-entries forever and starves the CPU

### Watchdog and Liveness
<!-- activation: keywords=["watchdog", "WDT", "IWDG", "HAL_IWDG_Refresh", "wdt_reset", "wdt_feed", "esp_task_wdt_reset"] -->

- [ ] **Long loop without watchdog refresh**: flag any `while`/`for` that can run longer than the watchdog period without a refresh call -- produces unexplained resets under load
- [ ] **Watchdog disabled in release**: flag `#ifdef DEBUG` guards that disable the watchdog; production must have it enabled, with dev-only bypass documented
- [ ] **Watchdog refreshed unconditionally from one task**: flag a pattern where a single task refreshes the watchdog regardless of other tasks' health -- watchdog should reflect system liveness (e.g., refresh only when all expected tasks have checked in)

### RTOS Task Sizing, Priorities, and Inversion
<!-- activation: keywords=["xTaskCreate", "xTaskCreateStatic", "k_thread_create", "ulTaskNotifyTake", "priority", "configMAX_PRIORITIES", "vTaskDelay"] -->

- [ ] **Task stack undersized**: flag `xTaskCreate(..., 128, ...)` style calls where the task uses recursion, printf, or large locals -- stack overflow corrupts the neighboring task's stack silently; use uxTaskGetStackHighWaterMark in test to size
- [ ] **Priority inversion risk**: flag `xSemaphoreCreateMutex` or `xSemaphoreCreateBinary` used to protect a resource shared between priorities, without priority inheritance (binary semaphore has none) -- low-priority task can block high-priority; use recursive / priority-inheritance mutex
- [ ] **High-priority task unbounded**: flag high-priority task with `while(1)` doing non-blocking work without `vTaskDelay` / block on queue -- starves everything below it
- [ ] **Stack overflow hook disabled**: flag `configCHECK_FOR_STACK_OVERFLOW == 0` (FreeRTOS) or no `CONFIG_STACK_SENTINEL` (Zephyr) -- silent corruption in the field

### DMA and Memory Hygiene
<!-- activation: keywords=["DMA", "HAL_UART_Receive_DMA", "HAL_SPI_Transmit_DMA", "dma_request", "__attribute__((aligned", "DTCM", "CCMRAM"] -->

- [ ] **DMA buffer on stack**: flag DMA buffers declared as function-local arrays -- lifetime ends when the function returns but DMA continues writing into whatever lives at that stack address
- [ ] **DMA buffer in cached region**: flag DMA buffers in main SRAM on Cortex-M7 / A-series with D-cache enabled, without `SCB_CleanDCache_by_Addr` / `SCB_InvalidateDCache_by_Addr` around the transfer -- reads stale cache lines
- [ ] **DMA buffer not aligned**: flag DMA buffers without `__attribute__((aligned(32)))` (or 4-byte minimum) -- some DMAs hard-fault on unaligned; cache-maintenance also requires cache-line alignment
- [ ] **DMA buffer shared between peripherals without double-buffering**: flag buffer used for both RX and TX of different peripherals -- hard to reason about and easy to race

### MMIO, volatile, and Memory Barriers
<!-- activation: keywords=["volatile", "DMB", "DSB", "ISB", "__DMB", "__DSB", "__ISB", "SCB", "NVIC", "atomic"] -->

- [ ] **MMIO register without volatile**: flag peripheral register accesses through a non-volatile pointer / struct -- the compiler may optimize the access away, reorder, or cache
- [ ] **Missing memory barrier on ARM Cortex after register write**: flag writes to NVIC / SCB / power registers without a following `__DSB()` / `__ISB()` as required by the ARM architectural reference -- the CPU may not see the effect before the next instruction
- [ ] **Shared variable across task / ISR without atomic or barrier**: flag ordinary reads / writes of shared state between an ISR and a task -- use `atomic_load` / `atomic_store`, or wrap in `portENTER_CRITICAL` / `portEXIT_CRITICAL`
- [ ] **__disable_irq without matching __enable_irq**: flag critical-section entry with early-return / goto paths that skip the re-enable -- deadlocks the system

### Real-Time and Allocation Safety
<!-- activation: keywords=["malloc", "free", "new", "delete", "std::vector", "std::string", "pvPortMalloc", "k_malloc"] -->

- [ ] **malloc / new in real-time loop**: flag dynamic allocation inside a control loop, ISR-triggered task, or motor-control path -- fragmentation and unpredictable latency; use static pools or FreeRTOS static allocation
- [ ] **Heap fragmentation risk**: flag repeated `malloc(n)` where `n` varies -- especially with heap_4 / heap_1 -- leads to unusable holes; prefer heap_5 with segregated regions or static pools
- [ ] **Non-reentrant libc function called from multiple tasks**: flag `strtok`, `rand`, `gmtime` shared across tasks without the _r variant -- silent data corruption

### Peripheral Error Handling
<!-- activation: keywords=["HAL_", "HAL_OK", "HAL_ERROR", "hal_status", "i2c_transfer", "spi_transfer", "ret", "status"] -->

- [ ] **HAL return code ignored**: flag `HAL_I2C_Master_Transmit(...)` / `HAL_SPI_Transmit(...)` whose return value is not checked against `HAL_OK` -- bus errors are silent and later reads return stale data
- [ ] **No recovery from bus stuck state**: flag I2C / SPI driver without a timeout + bus-reset / clock-toggling recovery path -- I2C slaves commonly get stuck holding SDA low and require manual clocking to release
- [ ] **Peripheral clock enabled but reset not released**: flag `__HAL_RCC_*_CLK_ENABLE()` without the paired `__HAL_RCC_*_RELEASE_RESET()` where needed -- register reads return 0 and the driver silently mis-configures

### Power, Sleep, and OTA
<!-- activation: keywords=["__WFI", "sleep", "deep_sleep", "suspend", "OTA", "bootloader", "image", "rollback"] -->

- [ ] **Deep sleep without wake source**: flag `__WFI` / `k_sleep(FOREVER)` / deep-sleep entry with no configured wake interrupt / RTC alarm -- the device never wakes
- [ ] **OTA without rollback**: flag firmware update path that erases and writes the active slot without an A/B / fail-safe slot and verified boot counter -- a bad image bricks the device
- [ ] **Bootloader missing image verification**: flag bootloader that jumps to the application slot without CRC / signature / version check -- corrupt flash boots corrupt firmware

## Common False Positives

- **Test / sim builds**: host-test builds of embedded code can call printf freely -- flag only in target-build paths or ISR source files actually compiled to the MCU.
- **Logging from ISR via ring buffer**: some projects deliberately push a compact record from ISR into a lockless ring buffer; not the same as printf in ISR.
- **Stack sized from tooling**: stack sizes derived from `uxTaskGetStackHighWaterMark` plus margin are fine even if they look small.
- **Bare-metal with watchdog disabled during debug**: acceptable under explicit `#ifdef DEBUG_NO_WDT` with a build-flag warning.
- **Volatile already implied**: some HAL structs already declare `volatile` members internally; a local `*reg` pointer need not re-declare.

## Severity Guidance

| Finding | Severity |
|---|---|
| OTA path with no rollback / signature verification | Critical |
| printf / malloc / blocking call in ISR | Critical |
| DMA buffer on stack or in cached memory without maintenance | Critical |
| Non-FromISR RTOS API used inside ISR | Critical |
| Priority inversion on shared mutex | Important |
| Watchdog not refreshed in long loop | Important |
| MMIO register accessed without volatile | Important |
| HAL return code ignored on critical bus | Important |
| Stack size likely too small for task usage | Minor |
| Deep sleep with no wake source | Minor |

## See Also

- `domain-iot-mqtt-coap-ota-fleet` -- fleet-level OTA orchestration, telemetry, and provisioning
- `principle-fail-fast` -- fault response philosophy in safety-critical firmware
- `perf-hot-path-allocations` -- allocation-in-hot-path detection (general)

## Authoritative References

- [ARM, "Cortex-M Memory Barriers"](https://developer.arm.com/documentation/dai0321/latest/)
- [FreeRTOS, "Interrupt Service Routines"](https://www.freertos.org/a00020.html)
- [FreeRTOS, "Stack Usage and Stack Overflow Checking"](https://www.freertos.org/Stacks-and-stack-overflow-checking.html)
- [Zephyr Project, "Interrupts and Exceptions"](https://docs.zephyrproject.org/latest/kernel/services/interrupts.html)
- [STM32, "AN4839: Level 1 Cache on STM32F7 Series and STM32H7 Series"](https://www.st.com/resource/en/application_note/an4839.pdf)
- [MISRA C:2012 Guidelines](https://www.misra.org.uk/)
