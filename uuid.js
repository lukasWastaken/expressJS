const { v4: uuidv4 } = require('uuid');
const uuid = uuidv4();
const newuuid = uuid.split("-")
console.log(newuuid[0])

