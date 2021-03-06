import { configManager } from './config-manager';
import { EventQueue } from './EventQueue';
import { globalAuth } from './global-auth';
import { fillDependencies } from './job-dependencies/loader';
import { getJobs } from './job-manager';
import logger from './logger';
import { Scheduler } from './Scheduler';
import { IJob, IJobOptions } from './type';

export function init(options: IJobOptions, cb: (error?: any) => void) {
  getJobs(options, (err: any, jobWorkers: IJob[]) => {
    if (err) {
      return cb(err);
    }

    const loadGlobalAuth = globalAuth(configManager('auth').authenticationFilePath);

    if (!jobWorkers.length) {
      logger().warn('No jobs found matching the current configuration and filters');
    } else {
      const queue = new EventQueue(options.deps.io);
      jobWorkers.forEach((jobWorker: any, index: any) => {

        // unique id for this widget in the wallboard
        // tslint:disable-next-line:max-line-length
        jobWorker.id = `${jobWorker.dashboard_name}-${(jobWorker.widget_item.r || jobWorker.widget_item.row)}-${(jobWorker.widget_item.c || jobWorker.widget_item.col)}`;

        jobWorker.pushUpdate = (data: any) => {
          queue.send(jobWorker.id, data);
        };

        // add security info
        jobWorker.config.globalAuth = loadGlobalAuth;

        if (jobWorker.widget_item.enabled !== false) {

          fillDependencies(jobWorker, options.deps);

          if (jobWorker.onInit) {
            jobWorker.onInit.call(jobWorker, jobWorker.config, jobWorker.dependencies);
          }

          if (jobWorker.onRun) {
            setTimeout(
              () => {
                const schedulers = new Scheduler(jobWorker);
                schedulers.start();
              },
              index * 1500,
            );
            // avoid a concurrency peak on startup
          }
        } else {
          // job is disabled
          jobWorker.pushUpdate({ error: 'disabled' });
        }

      });
    }
    return cb();
  });
}
