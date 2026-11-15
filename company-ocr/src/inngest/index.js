import { inngest } from "./client.js";
import { helloWorld } from "./functions/helloworld.js";
import { indexRepo } from "./functions/indexRepo.js";
import { queryRepo } from "./functions/queryRepo.js";

export { inngest };
export const functions = [helloWorld, indexRepo, queryRepo];