// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

// the link to your model provided by Teachable Machine export panel
const URL = "./model/";
let model, webcam, ctx, labelContainer, maxPredictions;

const waitingBox = document.querySelector(".waiting-box");
const countingBox = document.querySelector(".counting-box");
const canvas = document.getElementById("canvas");

let status = "stand";
let count = "0"; // Amount of squats done
let time = 5; // Waiting time before cam turns on
const max = 5; // Amount of squats in a set

waitingBox.addEventListener("click", () => {
  init();
});

function countdown() {
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      waitingBox.innerHTML = time;
      time--;
      if (time === -1) {
        clearInterval(timer);
        resolve(true);
      }
    }, 1000);
  });
}

async function init() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  // load the model and metadata
  // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
  // Note: the pose library adds a tmPose object to your window (window.tmPose)
  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  // Convenience function to setup a webcam
  const size = 1000;
  const flip = true; // whether to flip the webcam
  webcam = new tmPose.Webcam(size, size, flip); // width, height, flip
  await webcam.setup(); // request access to the webcam

  await countdown();

  waitingBox.classList.add("hidden");
  countingBox.classList.remove("hidden");
  canvas.parentElement.classList.remove("hidden");

  await webcam.play();
  window.requestAnimationFrame(loop);

  // append/get elements to the DOM
  // const canvas = document.getElementById("canvas");
  canvas.width = size;
  canvas.height = size;
  ctx = canvas.getContext("2d");
  labelContainer = document.getElementById("label-container");
  for (let i = 0; i < maxPredictions; i++) {
    // and class labels
    labelContainer.appendChild(document.createElement("div"));
  }
}

async function loop(timestamp) {
  webcam.update(); // update the webcam frame
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  // Prediction #1: run input through posenet
  // estimatePose can take in an image, video or canvas html element
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  // Prediction 2: run input through teachable machine classification model
  const prediction = await model.predict(posenetOutput);

  if (prediction[0].probability.toFixed(2) == 1.0) {
    if (status === "sit") {
      count++;
      countingBox.innerHTML = `${count}개`;
      if (count >= max) {
        countingBox.innerHTML = "끝";
        webcam.stop();
      }
    }
    status = "stand";
  } else if (prediction[1].probability.toFixed(2) == 1.0) {
    status = "sit";
  }

  for (let i = 0; i < maxPredictions; i++) {
    const classPrediction =
      prediction[i].className + ": " + prediction[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  // finally draw the poses
  drawPose(pose);
}

function drawPose(pose) {
  if (webcam.canvas) {
    ctx.drawImage(webcam.canvas, 0, 0);
    // draw the keypoints and skeleton
    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }
  }
}
