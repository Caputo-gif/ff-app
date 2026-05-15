fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({teste:true})}).then(r=>r.text()).then(d=>alert(d))
