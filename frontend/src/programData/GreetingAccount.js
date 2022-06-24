export class GreetingAccount {
  txt = '';
  constructor(fields = {txt: undefined}) {
    if (fields) {
      this.txt = fields.txt;
    }
  }
}