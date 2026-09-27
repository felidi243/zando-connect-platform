function createNotificationService(repository){
  return {
    notify: async({userId,type,title,message,metadata={}})=>repository.createNotification({userId,type,title,message,metadata}),
    list: async userId=>repository.listNotifications(userId)
  };
}
module.exports={createNotificationService};
