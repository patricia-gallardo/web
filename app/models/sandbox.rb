
class Sandbox

  def initialize(avatar)
    @avatar = avatar
  end

  # queries

  attr_reader :avatar

  def path
    avatar.path + 'sandbox' + '/'
  end

end
