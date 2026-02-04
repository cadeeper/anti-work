// 节流函数
function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func(...args);
    }
  };
}

// 发送事件到 background script
function sendEvent(eventType: 'click' | 'scroll' | 'input' | 'focus'): void {
  chrome.runtime.sendMessage({
    type: 'TRACK_EVENT',
    eventType,
  });
}

// 节流的滚动事件处理器（每30秒最多发送一次）
const throttledScroll = throttle(() => {
  sendEvent('scroll');
}, 30000);

// 节流的输入事件处理器（每10秒最多发送一次）
const throttledInput = throttle(() => {
  sendEvent('input');
}, 10000);

// 监听点击事件
document.addEventListener('click', () => {
  sendEvent('click');
}, { passive: true });

// 监听滚动事件
document.addEventListener('scroll', throttledScroll, { passive: true });

// 监听输入事件
document.addEventListener('input', throttledInput, { passive: true });

// 监听焦点事件（用于检测用户回到页面）
document.addEventListener('focus', () => {
  sendEvent('focus');
}, { passive: true });

// 页面可见性变化
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    sendEvent('focus');
  }
});
