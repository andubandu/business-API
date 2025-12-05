const mongoose = require('mongoose');
const Chat = require('../models/Chat');

async function addActiveMilestoneField() {
  await mongoose.connect('mongodb+srv://db:jxbIz22nESviW75s@cluster0.vvphx.mongodb.net/burner_srvice?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  await Chat.updateMany(
    { activeMilestone: { $exists: false } },
    { $set: { activeMilestone: null } }
  );
  console.log('All existing chats updated');

  await mongoose.disconnect();
}

addActiveMilestoneField();
