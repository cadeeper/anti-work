#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { startAgent, stopAgent } from './agent.js';
import { getConfig, setConfig, showConfig } from './config.js';

const program = new Command();

program
  .name('anti-work-agent')
  .description('Anti-Work 本地代码监控客户端')
  .version('1.0.0');

// 启动监控
program
  .command('start')
  .description('启动代码监控')
  .requiredOption('-u, --uuid <uuid>', '用户 UUID (必填)')
  .option('-s, --server <url>', '服务器地址', 'http://localhost:3000')
  .option('-i, --interval <seconds>', '轮询间隔（秒）', '300')
  .option('-w, --watch <paths...>', '监控目录')
  .action(async (options) => {
    console.log(chalk.bold.red('\n🔥 Anti-Work Agent\n'));

    // 保存配置
    setConfig('userUuid', options.uuid);
    if (options.server) {
      setConfig('serverUrl', options.server);
    }
    if (options.interval) {
      setConfig('pollInterval', parseInt(options.interval));
    }
    if (options.watch && options.watch.length > 0) {
      setConfig('watchPaths', options.watch);
    }

    const config = getConfig();

    console.log(chalk.gray(`服务器: ${config.serverUrl}`));
    console.log(chalk.gray(`用户 UUID: ${config.userUuid}`));
    console.log(chalk.gray(`轮询间隔: ${config.pollInterval}秒`));
    console.log(chalk.gray(`监控目录: (从服务端获取)`));
    console.log('');

    await startAgent();
  });

// 配置管理
program
  .command('config')
  .description('查看或修改配置')
  .option('-s, --server <url>', '设置服务器地址')
  .option('-u, --uuid <uuid>', '设置用户 UUID')
  .option('-i, --interval <seconds>', '设置轮询间隔')
  .option('-a, --add-path <path>', '添加监控目录')
  .option('-r, --remove-path <path>', '移除监控目录')
  .option('--show', '显示当前配置')
  .action((options) => {
    if (options.server) {
      setConfig('serverUrl', options.server);
      console.log(chalk.green(`✓ 服务器地址已设置为: ${options.server}`));
    }

    if (options.uuid) {
      setConfig('userUuid', options.uuid);
      console.log(chalk.green(`✓ 用户 UUID 已设置为: ${options.uuid}`));
    }

    if (options.interval) {
      setConfig('pollInterval', parseInt(options.interval));
      console.log(chalk.green(`✓ 轮询间隔已设置为: ${options.interval}秒`));
    }

    if (options.addPath) {
      const paths = getConfig().watchPaths || [];
      if (!paths.includes(options.addPath)) {
        paths.push(options.addPath);
        setConfig('watchPaths', paths);
        console.log(chalk.green(`✓ 已添加监控目录: ${options.addPath}`));
      }
    }

    if (options.removePath) {
      const paths = getConfig().watchPaths || [];
      const index = paths.indexOf(options.removePath);
      if (index > -1) {
        paths.splice(index, 1);
        setConfig('watchPaths', paths);
        console.log(chalk.green(`✓ 已移除监控目录: ${options.removePath}`));
      }
    }

    if (options.show || Object.keys(options).length === 0) {
      showConfig();
    }
  });

// 停止监控
program
  .command('stop')
  .description('停止代码监控')
  .action(() => {
    stopAgent();
    console.log(chalk.yellow('Agent 已停止'));
  });

program.parse();
