const mineflayer = require("mineflayer");
const serialPort = require("serialport");
const Readline = require("@serialport/parser-readline");
const inquirer = require("inquirer");

let data = {};
let isArduinoReady = false;

console.log("#####################################");
console.log("#                                   #");
console.log("#             ██████████            #");
console.log("#             █░░░░░░░░█            #");
console.log("#             █░██░░██░█            #");
console.log("#             █░░░░░░░░█            #");
console.log("#             █░░█░░█░░█            #");
console.log("#             █░░████░░█            #");
console.log("#             █░░░██░░░█            #");
console.log("#             ██████████            #");
console.log("#                                   #");
console.log("#  FILO CONNESSO ARDUCRAFT Daemon   #");
console.log("#             v. 0.0.1              #");
console.log("#                                   #");
console.log("#####################################");

let questions;

serialPort.list().then((ports) => {
  let Portlist = [];

  ports.forEach((port) => {
    Portlist.push(`${port.path}`);
  });

  questions = [
    {
      type: "rawlist",
      name: "serial_port",
      message: "Indicate the serial port: ",
      choices: Portlist,
    },
    {
      type: "input",
      name: "hostname",
      message: "Indicate the hostname: ",
    },
    {
      type: "input",
      name: "port",
      message: "Indicate the port: ",
      default() {
        return "25565";
      },
    },
    {
      type: "input",
      name: "version",
      message: "Indicate the server version: ",
      default() {
        return "1.17.1";
      },
    },
    {
      type: "input",
      name: "bot_name",
      message: "Indicate the bot name: ",
    },
  ];

  Main();
});

function DaemonCommandParser(message) {
  return message.includes("[DAEMON-CMD]");
}

async function Main() {
  inquirer
    .prompt(questions)

    .then((answers) => {
      const bot = mineflayer.createBot({
        host: answers.hostname,
        port: parseInt(answers.port),
        username: answers.bot_name,
        version: answers.version,
      });

      function lookAtPlayer() {
        const playerFilter = (entity) => entity.type === "player";
        const playerEntity = bot.nearestEntity(playerFilter);
        if (!playerEntity) return;
        const pos = playerEntity.position;
        bot.lookAt(pos);
      }

      const device = new serialPort(answers.serial_port, {
        baudRate: 115200,
      });

      const parser = device.pipe(new Readline({ delimiter: "\n" }));

      const ReadSerialPort = async () => {
        parser.on("data", (data) => {
          if (data.includes("[ARDUINO-CMD] connect")) {
            device.write("[DEAMON-CMD] connected");
            isArduinoReady = true;
          }
          if (isArduinoReady) {
            let command = data;
            command = command.replace(/(\r\n|\n|\r)/gm, "");
            if (!data.includes("[ARDUINO-CMD] connect")) {
              console.log(`BOT CONSOLE >>> ${command}`);
              bot.chat(command);
            }
          }
        });
      };

      ReadSerialPort();

      current_bot_status  = [
        {
          "spawn" : false,
          "kicked" : false,
          "end" : false,
          "death" : false,
          "health" : false,
          "error" : false
        }
      ];

      bot.on("spawn", function () {
        console.log("BOT CONSOLE >>> The bot appeared on the map");
      });
      bot.on("kicked", function () {
        console.log("BOT CONSOLE >>> The bot got kicked");
      });
      bot.on("end", function () {
        console.log("BOT CONSOLE >>> The bot is out");
      });
      bot.on("death", function () {
        console.log("BOT CONSOLE >>> The bot is dead");
      });
      bot.on("health", function () {
        console.log("BOT CONSOLE >>> The bot's health has changed");
      });
      bot.on("error", function (error_message) {
        console.log(`BOT CONSOLE >>> The bot gave an error : ${error_message}`);
      });

      async function sendTime() {
        device.write(`[DEAMON-CMD] worldtime ${bot.time.timeOfDay}`);
      }

      setInterval(sendTime, 2000);

      bot.on("chat", (username, message) => {
        if (username === bot.username) return;
        device.write(message + "\n");
      });

      bot.on("physicTick", lookAtPlayer);
    });
}
