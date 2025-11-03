use tokio::task::JoinHandle;
use tokio::time::{Duration, sleep};
use tracing;
use crate::common::periodic_task::{PeriodicTask, PeriodicTaskHandler};

/// Registry for managing multiple periodic tasks with auto-staggering
pub struct TaskRegistry {
    handles: Vec<JoinHandle<()>>,
    stagger_delay: Duration,
}

impl TaskRegistry {
    /// Create a new task registry
    pub fn new() -> Self {
        Self {
            handles: Vec::new(),
            stagger_delay: Duration::from_secs(15), // Default 15 seconds between tasks
        }
    }

    /// Create a new task registry with custom stagger delay
    pub fn with_stagger_delay(mut self, delay: Duration) -> Self {
        self.stagger_delay = delay;
        self
    }

    /// Register a new periodic task with automatic staggering
    pub fn register<T: PeriodicTaskHandler + 'static>(&mut self, handler: T) {
        let delay = self.stagger_delay * self.handles.len() as u32;
        let task_name = handler.name().to_string();
        let task = PeriodicTask::new(handler);
        
        let handle = tokio::spawn(async move {
            if delay > Duration::from_secs(0) {
                tracing::info!("{} task waiting {} seconds before starting", 
                              task_name, delay.as_secs());
                sleep(delay).await;
            }
            task.start().await;
        });
        
        self.handles.push(handle);
    }

    /// Wait for any task to finish (useful for shutdown handling)
    pub async fn wait_for_any(&mut self) -> Option<Result<(), tokio::task::JoinError>> {
        if self.handles.is_empty() {
            return None;
        }

        let (result, _index, remaining) = futures::future::select_all(self.handles.drain(..)).await;
        self.handles = remaining;
        Some(result)
    }

    /// Get the number of registered tasks
    pub fn task_count(&self) -> usize {
        self.handles.len()
    }

    /// Abort all running tasks (useful for shutdown)
    pub fn abort_all(&mut self) {
        for handle in self.handles.drain(..) {
            handle.abort();
        }
    }
}