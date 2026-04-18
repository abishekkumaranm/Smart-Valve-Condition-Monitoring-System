navigator.mediaDevices.getUserMedia({video:true})

.then(stream=>{

for(let i=1;i<=10;i++){

let cam = document.getElementById("cam"+i)

if(cam){

cam.srcObject = stream

}

}

})

.catch(err => {

console.error("Camera error:",err)

})
