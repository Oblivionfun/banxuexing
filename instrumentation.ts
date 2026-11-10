export async function register() {
  // 动态导入：演示数据依赖 better-sqlite3 和 sharp，只能在 Node.js 运行时加载（Next 官方推荐的写法）
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DEMO_MODE === "1") {
    const { ensureDemoData } = await import("./lib/demo");
    await ensureDemoData();
  }
}
