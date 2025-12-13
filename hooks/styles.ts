import { StyleSheet, I18nManager } from 'react-native';

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9f9f9', 
    paddingHorizontal: 15,
  },
  header: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginVertical: 20, 
    color: '#000' 
  },
  avatarContainer: { 
    alignSelf: 'center', 
    position: 'relative', 
    marginBottom: 20 
  },
  avatar: { 
    width: 130, 
    height: 130, 
    borderRadius: 65, 
    borderWidth: 4, 
    borderColor: '#0066cc' 
  },
  avatarPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0066cc',
    borderStyle: 'dashed',
  },
  avatarText: { 
    color: '#666', 
    textAlign: 'center', 
    fontSize: 14 
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0066cc',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { 
    fontSize: 17, 
    fontWeight: '600', 
    marginTop: 20, 
    marginBottom: 8, 
    color: '#333',
    textAlign: 'right'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
    fontSize: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    textAlign: 'right'
  },
});

export default styles;