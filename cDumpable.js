import { makeDumpable } from "./debugUtils";

class Dumpable {
  constructor() {
    makeDumpable(this);
  }
}
