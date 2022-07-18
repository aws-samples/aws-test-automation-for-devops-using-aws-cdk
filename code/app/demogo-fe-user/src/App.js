import logo from './Demogo-logo.png';
import './App.css';
import React, {useState, useEffect} from 'react';
import axios from 'axios';
import Button from "./button";


function App() {
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const[name, setName] = useState("");
  const[id, setId] = useState("");

  const handleChangeName = ({target: {value}}) => setName(value);
  const handleChangeId = ({target: {value}}) => setId(value);

 
  const fetchUsers = async() => {
    try{
      setUsers(null);
      setError(null);
      setLoading(true);

      const response = await axios.get('http://[[ALB_URL]].[[REGION]].elb.amazonaws.com:8080/user/users');
      setUsers(response.data);
    }catch(e){
      alert(e)
      setError(e);
    }
    setLoading(false);
  };

  useEffect( () =>{
    fetchUsers();
  },[]);

  const refresh=()=>{
    window.location.reload(false);
  };
  if(loading) return <div>Loading...</div>
  if(error) return <div>Error!!!</div>
  if(!users) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    axios.post('http://[[ALB_URL]].[[REGION]].elb.amazonaws.com:8080/user/user',{
      "Name" : `${name}`,
      "Id" : `${id}`
    });
  }


  return (
    <div id="maindiv" className="App">
      <header className="App-header">
        <img src={logo} alt="logo" />
        <p>
          Demogo Users
        </p>
      </header>
      <main>
        <>
          <ul>
            {users.map(user => <li key={user.Seq} class="li">
              [{user.Grade}]{user.Id} ( {user.Name} )
            </li>)}
          </ul>
        </>
      </main>
      <refresh>
      <button id="refresh" onClick={() => refresh()}>Refresh</button>
      </refresh>
      <add className="App-add">
        <form id="form" onSubmit={handleSubmit}>
          <label>이름 : </label> 
          <input id="name" value={name} onChange={handleChangeName}/>
          <label>ID : </label> 
          <input id="id" value={id} onChange={handleChangeId}/>
          <button type="submit" id="submit">add</button>
        </form>
      </add>
    </div>
    
  );
}

export default App;
