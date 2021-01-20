// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btns = document.getElementsByClassName("modal-link");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

var request = new XMLHttpRequest();
request.open("GET", "./json/project-detail.json", false);
request.send(null)
var projects = JSON.parse(request.responseText);

// When the user clicks the button, open the modal
for(var i=0; i<btns.length; i++){
  btns[i].onclick = function() {
  modal.style.display = "block";

  for(var j=0;j<projects.length;j++){
    if(this.id == projects[j]['id']){
        var current = projects[j];
    }
  }

  document.getElementsByClassName("modal-body")[0].innerHTML =
  "<h4>" +current['title'] + "</h4>"
  +"<hr>"
  +"<h5>Abstract</h5>"
  +current['abstract']
  +"<hr>"
  +"<h5>Citation</h5>"
  +"&ensp;BibTeX"
  +"<div class=\"bib\">"+current['bibtex']+"</div>"
  +"&ensp;ACM Ref"
  +"<div class=\"bib\">"+current['acmref']+"</div>"
  ;
  }
}

//document.getElementsByClassName("modal-body")[0].innerHTML = projects[0]['title'];
//  console.log(i);

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";

}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}